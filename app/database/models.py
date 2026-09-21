"""SQLAlchemy models for the physical tables in the RackTables schema.

Generated from the live MariaDB schema. Views are intentionally excluded.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    FetchedValue,
    ForeignKeyConstraint,
    Index,
    PrimaryKeyConstraint,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Atom(Base):
    __tablename__ = 'Atom'
    __table_args__ = (
        PrimaryKeyConstraint('molecule_id', 'rack_id', 'unit_no', 'atom', name='PRIMARY'),
        Index('Atom-FK-rack_id', 'rack_id'),
        ForeignKeyConstraint(['molecule_id'], ['Molecule.id'], name='Atom-FK-molecule_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['rack_id'], ['Object.id'], name='Atom-FK-rack_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    molecule_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    rack_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    unit_no: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    atom: Mapped[str] = mapped_column(mysql.ENUM('front', 'interior', 'rear'), nullable=False)


class Attribute(Base):
    __tablename__ = 'Attribute'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('name', name='name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    type: Mapped[str | None] = mapped_column(mysql.ENUM('string', 'uint', 'float', 'dict', 'date'), nullable=True)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)


class AttributeMap(Base):
    __tablename__ = 'AttributeMap'
    __table_args__ = (
        Index('attr_id', 'attr_id'),
        Index('chapter_id', 'chapter_id'),
        UniqueConstraint('objtype_id', 'attr_id', name='objtype_id'),
        ForeignKeyConstraint(['attr_id'], ['Attribute.id'], name='AttributeMap-FK-attr_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['chapter_id'], ['Chapter.id'], name='AttributeMap-FK-chapter_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    objtype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                            server_default=text('1'))
    attr_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('1'))
    chapter_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    sticky: Mapped[str | None] = mapped_column(mysql.ENUM('yes', 'no'), nullable=True, server_default=text("'no'"))
    __mapper_args__ = {"primary_key": (objtype_id, attr_id)}


class AttributeValue(Base):
    __tablename__ = 'AttributeValue'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'attr_id', name='PRIMARY'),
        Index('attr_id-string_value', 'attr_id', 'string_value', mysql_length={'string_value': 12}),
        Index('attr_id-uint_value', 'attr_id', 'uint_value'),
        Index('id-tid', 'object_id', 'object_tid'),
        Index('object_tid-attr_id', 'object_tid', 'attr_id'),
        ForeignKeyConstraint(['object_tid', 'attr_id'], ['AttributeMap.objtype_id', 'AttributeMap.attr_id'],
                             name='AttributeValue-FK-map', onupdate='RESTRICT', ondelete='RESTRICT'),
        ForeignKeyConstraint(['object_id', 'object_tid'], ['Object.id', 'Object.objtype_id'],
                             name='AttributeValue-FK-object', onupdate='CASCADE', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    object_tid: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                            server_default=text('0'))
    attr_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    string_value: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    uint_value: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    float_value: Mapped[float | None] = mapped_column(mysql.FLOAT(), nullable=True)


class CachedPAV(Base):
    __tablename__ = 'CachedPAV'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', 'vlan_id', name='PRIMARY'),
        Index('vlan_id', 'vlan_id'),
        ForeignKeyConstraint(['object_id', 'port_name'], ['CachedPVM.object_id', 'CachedPVM.port_name'],
                             name='CachedPAV-FK-object-port', onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['vlan_id'], ['VLANValidID.vlan_id'], name='CachedPAV-FK-vlan_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))


class CachedPNV(Base):
    __tablename__ = 'CachedPNV'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', 'vlan_id', name='PRIMARY'),
        UniqueConstraint('object_id', 'port_name', name='port_id'),
        ForeignKeyConstraint(['object_id', 'port_name', 'vlan_id'],
                             ['CachedPAV.object_id', 'CachedPAV.port_name', 'CachedPAV.vlan_id'],
                             name='CachedPNV-FK-compound', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))


class CachedPVM(Base):
    __tablename__ = 'CachedPVM'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', name='PRIMARY'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='CachedPVM-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_mode: Mapped[str] = mapped_column(mysql.ENUM('access', 'trunk'), nullable=False,
                                           server_default=text("'access'"))


class Chapter(Base):
    __tablename__ = 'Chapter'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('name', name='name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    sticky: Mapped[str | None] = mapped_column(mysql.ENUM('yes', 'no'), nullable=True, server_default=text("'no'"))
    name: Mapped[str] = mapped_column(mysql.CHAR(128), nullable=False)


class Config(Base):
    __tablename__ = 'Config'
    __table_args__ = (
        PrimaryKeyConstraint('varname', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    varname: Mapped[str] = mapped_column(mysql.CHAR(32), nullable=False)
    varvalue: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)
    vartype: Mapped[str] = mapped_column(mysql.ENUM('string', 'uint'), nullable=False, server_default=text("'string'"))
    emptyok: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'no'"))
    is_hidden: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'yes'"))
    is_userdefined: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'no'"))
    description: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class Dictionary(Base):
    __tablename__ = 'Dictionary'
    __table_args__ = (
        PrimaryKeyConstraint('dict_key', name='PRIMARY'),
        UniqueConstraint('chapter_id', 'dict_value', 'dict_sticky', name='dict_unique'),
        ForeignKeyConstraint(['chapter_id'], ['Chapter.id'], name='Dictionary-FK-chapter_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    chapter_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    dict_key: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                          autoincrement=True)
    dict_sticky: Mapped[str | None] = mapped_column(mysql.ENUM('yes', 'no'), nullable=True, server_default=text("'no'"))
    dict_value: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class EntityLink(Base):
    __tablename__ = 'EntityLink'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('EntityLink-compound', 'parent_entity_type', 'child_entity_type', 'child_entity_id'),
        UniqueConstraint('parent_entity_type', 'parent_entity_id', 'child_entity_type', 'child_entity_id',
                         name='EntityLink-unique'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    parent_entity_type: Mapped[str] = mapped_column(mysql.ENUM('location', 'object', 'rack', 'row'), nullable=False)
    parent_entity_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    child_entity_type: Mapped[str] = mapped_column(mysql.ENUM('location', 'object', 'rack', 'row'), nullable=False)
    child_entity_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)


class File(Base):
    __tablename__ = 'File'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('name', name='name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    type: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    size: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    ctime: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    mtime: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    atime: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    thumbnail: Mapped[bytes | None] = mapped_column(mysql.LONGBLOB(), nullable=True)
    contents: Mapped[bytes] = mapped_column(mysql.LONGBLOB(), nullable=False)
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class FileLink(Base):
    __tablename__ = 'FileLink'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('FileLink-file_id', 'file_id'),
        UniqueConstraint('file_id', 'entity_type', 'entity_id', name='FileLink-unique'),
        ForeignKeyConstraint(['file_id'], ['File.id'], name='FileLink-File_fkey', onupdate='CASCADE',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    file_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    entity_type: Mapped[str] = mapped_column(
        mysql.ENUM('ipv4net', 'ipv4rspool', 'ipv4vs', 'ipvs', 'ipv6net', 'location', 'object', 'rack', 'row', 'user'),
        nullable=False, server_default=text("'object'"))
    entity_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10), nullable=False)


class IPv4Address(Base):
    __tablename__ = 'IPv4Address'
    __table_args__ = (
        PrimaryKeyConstraint('ip', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    ip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                    server_default=text('0'))
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    comment: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    reserved: Mapped[str | None] = mapped_column(mysql.ENUM('yes', 'no'), nullable=True)


class IPv4Allocation(Base):
    __tablename__ = 'IPv4Allocation'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'ip', name='PRIMARY'),
        Index('ip', 'ip'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='IPv4Allocation-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    ip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                    server_default=text('0'))
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    type: Mapped[str] = mapped_column(
        mysql.ENUM('regular', 'shared', 'virtual', 'router', 'point2point', 'sharedrouter'), nullable=False,
        server_default=text("'regular'"))


class IPv4LB(Base):
    __tablename__ = 'IPv4LB'
    __table_args__ = (
        Index('IPv4LB-FK-rspool_id', 'rspool_id'),
        Index('IPv4LB-FK-vs_id', 'vs_id'),
        UniqueConstraint('object_id', 'vs_id', name='LB-VS'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='IPv4LB-FK-object_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['rspool_id'], ['IPv4RSPool.id'], name='IPv4LB-FK-rspool_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['vs_id'], ['IPv4VS.id'], name='IPv4LB-FK-vs_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    rspool_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    vs_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    prio: Mapped[str | None] = mapped_column(mysql.VARCHAR(255), nullable=True)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    __mapper_args__ = {"primary_key": (object_id, vs_id)}


class IPv4Log(Base):
    __tablename__ = 'IPv4Log'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('ip-date', 'ip', 'date'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10), nullable=False, autoincrement=True)
    ip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    date: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    user: Mapped[str] = mapped_column(mysql.VARCHAR(64), nullable=False)
    message: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)


class IPv4NAT(Base):
    __tablename__ = 'IPv4NAT'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'proto', 'localip', 'localport', 'remoteip', 'remoteport', name='PRIMARY'),
        Index('localip', 'localip'),
        Index('object_id', 'object_id'),
        Index('remoteip', 'remoteip'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='IPv4NAT-FK-object_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    proto: Mapped[str] = mapped_column(mysql.ENUM('TCP', 'UDP', 'ALL'), nullable=False, server_default=text("'TCP'"))
    localip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))
    localport: Mapped[int] = mapped_column(mysql.SMALLINT(display_width=5, unsigned=True), nullable=False,
                                           server_default=text('0'))
    remoteip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                          server_default=text('0'))
    remoteport: Mapped[int] = mapped_column(mysql.SMALLINT(display_width=5, unsigned=True), nullable=False,
                                            server_default=text('0'))
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class IPv4Network(Base):
    __tablename__ = 'IPv4Network'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('ip', 'mask', name='base-len'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    ip: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                    server_default=text('0'))
    mask: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                      server_default=text('0'))
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class IPv4RS(Base):
    __tablename__ = 'IPv4RS'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('rspool_id', 'rsip', 'rsport', name='pool-endpoint'),
        Index('rsip', 'rsip'),
        ForeignKeyConstraint(['rspool_id'], ['IPv4RSPool.id'], name='IPv4RS-FK', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    inservice: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'no'"))
    rsip: Mapped[bytes] = mapped_column(mysql.VARBINARY(16), nullable=False)
    rsport: Mapped[int | None] = mapped_column(mysql.SMALLINT(display_width=5, unsigned=True), nullable=True)
    rspool_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    comment: Mapped[str | None] = mapped_column(mysql.VARCHAR(255), nullable=True)


class IPv4RSPool(Base):
    __tablename__ = 'IPv4RSPool'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class IPv4VS(Base):
    __tablename__ = 'IPv4VS'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('vip', 'vip'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    vip: Mapped[bytes] = mapped_column(mysql.VARBINARY(16), nullable=False)
    vport: Mapped[int | None] = mapped_column(mysql.SMALLINT(display_width=5, unsigned=True), nullable=True)
    proto: Mapped[str] = mapped_column(mysql.ENUM('TCP', 'UDP', 'MARK'), nullable=False, server_default=text("'TCP'"))
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class IPv6Address(Base):
    __tablename__ = 'IPv6Address'
    __table_args__ = (
        PrimaryKeyConstraint('ip', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    ip: Mapped[bytes] = mapped_column(mysql.BINARY(16), nullable=False)
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    comment: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    reserved: Mapped[str | None] = mapped_column(mysql.ENUM('yes', 'no'), nullable=True)


class IPv6Allocation(Base):
    __tablename__ = 'IPv6Allocation'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'ip', name='PRIMARY'),
        Index('ip', 'ip'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='IPv6Allocation-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    ip: Mapped[bytes] = mapped_column(mysql.BINARY(16), nullable=False)
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    type: Mapped[str] = mapped_column(
        mysql.ENUM('regular', 'shared', 'virtual', 'router', 'point2point', 'sharedrouter'), nullable=False,
        server_default=text("'regular'"))


class IPv6Log(Base):
    __tablename__ = 'IPv6Log'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('ip-date', 'ip', 'date'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10), nullable=False, autoincrement=True)
    ip: Mapped[bytes] = mapped_column(mysql.BINARY(16), nullable=False)
    date: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    user: Mapped[str] = mapped_column(mysql.VARCHAR(64), nullable=False)
    message: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)


class IPv6Network(Base):
    __tablename__ = 'IPv6Network'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('ip', 'mask', name='ip'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    ip: Mapped[bytes] = mapped_column(mysql.BINARY(16), nullable=False)
    mask: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    last_ip: Mapped[bytes] = mapped_column(mysql.BINARY(16), nullable=False)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class LDAPCache(Base):
    __tablename__ = 'LDAPCache'
    __table_args__ = (
        UniqueConstraint('presented_username', name='presented_username'),
        Index('scanidx', 'presented_username', 'successful_hash'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    presented_username: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    successful_hash: Mapped[str] = mapped_column(mysql.CHAR(40), nullable=False)
    first_success: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                                    server_default=text('current_timestamp()'))
    last_retry: Mapped[datetime | None] = mapped_column(mysql.TIMESTAMP(), nullable=True)
    displayed_name: Mapped[str | None] = mapped_column(mysql.CHAR(128), nullable=True)
    memberof: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    __mapper_args__ = {"primary_key": (presented_username,)}


class Link(Base):
    __tablename__ = 'Link'
    __table_args__ = (
        PrimaryKeyConstraint('porta', 'portb', name='PRIMARY'),
        UniqueConstraint('porta', name='porta'),
        UniqueConstraint('portb', name='portb'),
        ForeignKeyConstraint(['porta'], ['Port.id'], name='Link-FK-a', onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['portb'], ['Port.id'], name='Link-FK-b', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    porta: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                       server_default=text('0'))
    portb: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                       server_default=text('0'))
    cable: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)


class Molecule(Base):
    __tablename__ = 'Molecule'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)


class MountOperation(Base):
    __tablename__ = 'MountOperation'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('new_molecule_id', name='new_molecule_id'),
        Index('object_id', 'object_id'),
        UniqueConstraint('old_molecule_id', name='old_molecule_id'),
        ForeignKeyConstraint(['new_molecule_id'], ['Molecule.id'], name='MountOperation-FK-new_molecule_id',
                             onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='MountOperation-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['old_molecule_id'], ['Molecule.id'], name='MountOperation-FK-old_molecule_id',
                             onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    ctime: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                            server_default=text('current_timestamp() ON UPDATE current_timestamp()'),
                                            server_onupdate=FetchedValue())
    user_name: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)
    old_molecule_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    new_molecule_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class Object(Base):
    __tablename__ = 'Object'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('asset_no', name='asset_no'),
        Index('id-tid', 'id', 'objtype_id'),
        Index('type_id', 'objtype_id', 'id'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    label: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    objtype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                            server_default=text('1'))
    asset_no: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)
    has_problems: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'no'"))
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class ObjectHistory(Base):
    __tablename__ = 'ObjectHistory'
    __table_args__ = (
        PrimaryKeyConstraint('event_id', name='PRIMARY'),
        Index('id', 'id'),
        ForeignKeyConstraint(['id'], ['Object.id'], name='ObjectHistory-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    event_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                          autoincrement=True)
    id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    label: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    objtype_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    asset_no: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)
    has_problems: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'no'"))
    comment: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    ctime: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                            server_default=text('current_timestamp() ON UPDATE current_timestamp()'),
                                            server_onupdate=FetchedValue())
    user_name: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)


class ObjectLog(Base):
    __tablename__ = 'ObjectLog'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('date', 'date'),
        Index('object_id', 'object_id'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='ObjectLog-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    user: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    date: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    content: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)


class ObjectParentCompat(Base):
    __tablename__ = 'ObjectParentCompat'
    __table_args__ = (
        UniqueConstraint('parent_objtype_id', 'child_objtype_id', name='parent_child'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    parent_objtype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    child_objtype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    __mapper_args__ = {"primary_key": (parent_objtype_id, child_objtype_id)}


class PatchCableConnector(Base):
    __tablename__ = 'PatchCableConnector'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('connector', 'origin', name='connector_per_origin'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    origin: Mapped[str] = mapped_column(mysql.ENUM('default', 'custom'), nullable=False,
                                        server_default=text("'custom'"))
    connector: Mapped[str] = mapped_column(mysql.CHAR(32), nullable=False)


class PatchCableConnectorCompat(Base):
    __tablename__ = 'PatchCableConnectorCompat'
    __table_args__ = (
        PrimaryKeyConstraint('pctype_id', 'connector_id', name='PRIMARY'),
        Index('connector_id', 'connector_id'),
        ForeignKeyConstraint(['connector_id'], ['PatchCableConnector.id'],
                             name='PatchCableConnectorCompat-FK-connector_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['pctype_id'], ['PatchCableType.id'], name='PatchCableConnectorCompat-FK-pctype_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    pctype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    connector_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)


class PatchCableHeap(Base):
    __tablename__ = 'PatchCableHeap'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('compat1', 'pctype_id', 'end1_conn_id'),
        Index('compat2', 'pctype_id', 'end2_conn_id'),
        ForeignKeyConstraint(['pctype_id', 'end1_conn_id'],
                             ['PatchCableConnectorCompat.pctype_id', 'PatchCableConnectorCompat.connector_id'],
                             name='PatchCableHeap-FK-compat1', onupdate='RESTRICT', ondelete='RESTRICT'),
        ForeignKeyConstraint(['pctype_id', 'end2_conn_id'],
                             ['PatchCableConnectorCompat.pctype_id', 'PatchCableConnectorCompat.connector_id'],
                             name='PatchCableHeap-FK-compat2', onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    pctype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    end1_conn_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    end2_conn_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    amount: Mapped[int] = mapped_column(mysql.SMALLINT(display_width=5, unsigned=True), nullable=False,
                                        server_default=text('0'))
    length: Mapped[Decimal] = mapped_column(mysql.DECIMAL(5, 2, unsigned=True), nullable=False,
                                            server_default=text('1.00'))
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class PatchCableHeapLog(Base):
    __tablename__ = 'PatchCableHeapLog'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('heap_id-date', 'heap_id', 'date'),
        ForeignKeyConstraint(['heap_id'], ['PatchCableHeap.id'], name='PatchCableHeapLog-FK-heap_id',
                             onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    heap_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    date: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    user: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    message: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)


class PatchCableOIFCompat(Base):
    __tablename__ = 'PatchCableOIFCompat'
    __table_args__ = (
        PrimaryKeyConstraint('pctype_id', 'oif_id', name='PRIMARY'),
        Index('oif_id', 'oif_id'),
        ForeignKeyConstraint(['oif_id'], ['PortOuterInterface.id'], name='PatchCableOIFCompat-FK-oif_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        ForeignKeyConstraint(['pctype_id'], ['PatchCableType.id'], name='PatchCableOIFCompat-FK-pctype_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    pctype_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    oif_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)


class PatchCableType(Base):
    __tablename__ = 'PatchCableType'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('pctype', 'origin', name='pctype_per_origin'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    origin: Mapped[str] = mapped_column(mysql.ENUM('default', 'custom'), nullable=False,
                                        server_default=text("'custom'"))
    pctype: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)


class Plugin(Base):
    __tablename__ = 'Plugin'
    __table_args__ = (
        PrimaryKeyConstraint('name', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    longname: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    version: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    home_url: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    state: Mapped[str] = mapped_column(mysql.ENUM('disabled', 'enabled'), nullable=False,
                                       server_default=text("'disabled'"))


class Port(Base):
    __tablename__ = 'Port'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('Port-FK-iif-oif', 'iif_id', 'type'),
        Index('comment', 'reservation_comment'),
        Index('l2address', 'l2address'),
        UniqueConstraint('object_id', 'iif_id', 'type', 'name', name='object_iif_oif_name'),
        Index('type', 'type'),
        ForeignKeyConstraint(['iif_id', 'type'], ['PortInterfaceCompat.iif_id', 'PortInterfaceCompat.oif_id'],
                             name='Port-FK-iif-oif', onupdate='RESTRICT', ondelete='RESTRICT'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='Port-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False, server_default=text("''"))
    iif_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    type: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                      server_default=text('0'))
    l2address: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)
    reservation_comment: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    label: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class PortAllowedVLAN(Base):
    __tablename__ = 'PortAllowedVLAN'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', 'vlan_id', name='PRIMARY'),
        Index('vlan_id', 'vlan_id'),
        ForeignKeyConstraint(['object_id', 'port_name'], ['PortVLANMode.object_id', 'PortVLANMode.port_name'],
                             name='PortAllowedVLAN-FK-object-port', onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['vlan_id'], ['VLANValidID.vlan_id'], name='PortAllowedVLAN-FK-vlan_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))


class PortCompat(Base):
    __tablename__ = 'PortCompat'
    __table_args__ = (
        UniqueConstraint('type1', 'type2', name='type1_2'),
        Index('type2', 'type2'),
        ForeignKeyConstraint(['type1'], ['PortOuterInterface.id'], name='PortCompat-FK-oif_id1', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['type2'], ['PortOuterInterface.id'], name='PortCompat-FK-oif_id2', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    type1: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                       server_default=text('0'))
    type2: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                       server_default=text('0'))
    __mapper_args__ = {"primary_key": (type1, type2)}


class PortInnerInterface(Base):
    __tablename__ = 'PortInnerInterface'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('iif_name', name='iif_name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    iif_name: Mapped[str] = mapped_column(mysql.CHAR(16), nullable=False)


class PortInterfaceCompat(Base):
    __tablename__ = 'PortInterfaceCompat'
    __table_args__ = (
        Index('PortInterfaceCompat-FK-oif_id', 'oif_id'),
        UniqueConstraint('iif_id', 'oif_id', name='pair'),
        ForeignKeyConstraint(['iif_id'], ['PortInnerInterface.id'], name='PortInterfaceCompat-FK-iif_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        ForeignKeyConstraint(['oif_id'], ['PortOuterInterface.id'], name='PortInterfaceCompat-FK-oif_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    iif_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    oif_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    __mapper_args__ = {"primary_key": (iif_id, oif_id)}


class PortLog(Base):
    __tablename__ = 'PortLog'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('port_id-date', 'port_id', 'date'),
        ForeignKeyConstraint(['port_id'], ['Port.id'], name='PortLog_ibfk_1', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    port_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    date: Mapped[datetime] = mapped_column(mysql.DATETIME(), nullable=False)
    user: Mapped[str] = mapped_column(mysql.VARCHAR(64), nullable=False)
    message: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)


class PortNativeVLAN(Base):
    __tablename__ = 'PortNativeVLAN'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', 'vlan_id', name='PRIMARY'),
        UniqueConstraint('object_id', 'port_name', name='port_id'),
        ForeignKeyConstraint(['object_id', 'port_name', 'vlan_id'],
                             ['PortAllowedVLAN.object_id', 'PortAllowedVLAN.port_name', 'PortAllowedVLAN.vlan_id'],
                             name='PortNativeVLAN-FK-compound', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))


class PortOuterInterface(Base):
    __tablename__ = 'PortOuterInterface'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('oif_name', name='oif_name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    oif_name: Mapped[str] = mapped_column(mysql.CHAR(48), nullable=False)


class PortVLANMode(Base):
    __tablename__ = 'PortVLANMode'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'port_name', name='PRIMARY'),
        ForeignKeyConstraint(['object_id', 'port_name'], ['CachedPVM.object_id', 'CachedPVM.port_name'],
                             name='PortVLANMode-FK-object-port', onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_name: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    vlan_mode: Mapped[str] = mapped_column(mysql.ENUM('access', 'trunk'), nullable=False,
                                           server_default=text("'access'"))


class RackSpace(Base):
    __tablename__ = 'RackSpace'
    __table_args__ = (
        PrimaryKeyConstraint('rack_id', 'unit_no', 'atom', name='PRIMARY'),
        Index('RackSpace_object_id', 'object_id'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='RackSpace-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['rack_id'], ['Object.id'], name='RackSpace-FK-rack_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    rack_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))
    unit_no: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))
    atom: Mapped[str] = mapped_column(mysql.ENUM('front', 'interior', 'rear'), nullable=False,
                                      server_default=text("'interior'"))
    state: Mapped[str] = mapped_column(mysql.ENUM('A', 'U', 'T'), nullable=False, server_default=text("'A'"))
    object_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)


class RackThumbnail(Base):
    __tablename__ = 'RackThumbnail'
    __table_args__ = (
        UniqueConstraint('rack_id', name='rack_id'),
        ForeignKeyConstraint(['rack_id'], ['Object.id'], name='RackThumbnail-FK-rack_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    rack_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    thumb_data: Mapped[bytes | None] = mapped_column(mysql.BLOB(), nullable=True)
    __mapper_args__ = {"primary_key": (rack_id,)}


class Script(Base):
    __tablename__ = 'Script'
    __table_args__ = (
        PrimaryKeyConstraint('script_name', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    script_name: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    script_text: Mapped[str | None] = mapped_column(mysql.LONGTEXT(), nullable=True)


class TagStorage(Base):
    __tablename__ = 'TagStorage'
    __table_args__ = (
        Index('TagStorage-FK-tag_id', 'tag_id'),
        Index('entity_id', 'entity_id'),
        UniqueConstraint('entity_realm', 'entity_id', 'tag_id', name='entity_tag'),
        Index('tag_id-tag_is_assignable', 'tag_id', 'tag_is_assignable'),
        ForeignKeyConstraint(['tag_id', 'tag_is_assignable'], ['TagTree.id', 'TagTree.is_assignable'],
                             name='TagStorage-FK-TagTree', onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    entity_realm: Mapped[str] = mapped_column(
        mysql.ENUM('file', 'ipv4net', 'ipv4rspool', 'ipv4vs', 'ipvs', 'ipv6net', 'location', 'object', 'rack', 'user',
                   'vst'), nullable=False, server_default=text("'object'"))
    entity_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    tag_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                        server_default=text('0'))
    tag_is_assignable: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False,
                                                   server_default=text("'yes'"))
    user: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)
    date: Mapped[datetime | None] = mapped_column(mysql.DATETIME(), nullable=True)
    __mapper_args__ = {"primary_key": (entity_realm, entity_id, tag_id)}


class TagTree(Base):
    __tablename__ = 'TagTree'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('TagTree-K-parent_id', 'parent_id'),
        Index('id-is_assignable', 'id', 'is_assignable'),
        UniqueConstraint('tag', name='tag'),
        ForeignKeyConstraint(['parent_id'], ['TagTree.id'], name='TagTree-K-parent_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    is_assignable: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'yes'"))
    tag: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    color: Mapped[int | None] = mapped_column(mysql.MEDIUMINT(display_width=8, unsigned=True), nullable=True)
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class UserAccount(Base):
    __tablename__ = 'UserAccount'
    __table_args__ = (
        PrimaryKeyConstraint('user_id', name='PRIMARY'),
        UniqueConstraint('user_name', name='user_name'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    user_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         autoincrement=True)
    user_name: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False, server_default=text("''"))
    user_password_hash: Mapped[str | None] = mapped_column(mysql.CHAR(40), nullable=True)
    user_realname: Mapped[str | None] = mapped_column(mysql.CHAR(64), nullable=True)


class UserConfig(Base):
    __tablename__ = 'UserConfig'
    __table_args__ = (
        UniqueConstraint('user', 'varname', name='user_varname'),
        Index('varname', 'varname'),
        ForeignKeyConstraint(['varname'], ['Config.varname'], name='UserConfig-FK-varname', onupdate='CASCADE',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    varname: Mapped[str] = mapped_column(mysql.CHAR(32), nullable=False)
    varvalue: Mapped[str] = mapped_column(mysql.TEXT(), nullable=False)
    user: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)
    __mapper_args__ = {"primary_key": (user, varname)}


class VLANDescription(Base):
    __tablename__ = 'VLANDescription'
    __table_args__ = (
        PrimaryKeyConstraint('domain_id', 'vlan_id', name='PRIMARY'),
        Index('vlan_id', 'vlan_id'),
        ForeignKeyConstraint(['domain_id'], ['VLANDomain.id'], name='VLANDescription-FK-domain_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['vlan_id'], ['VLANValidID.vlan_id'], name='VLANDescription-FK-vlan_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    domain_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('0'))
    vlan_type: Mapped[str] = mapped_column(mysql.ENUM('ondemand', 'compulsory', 'alien'), nullable=False,
                                           server_default=text("'ondemand'"))
    vlan_descr: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class VLANDomain(Base):
    __tablename__ = 'VLANDomain'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        Index('VLANDomain-FK-group_id', 'group_id'),
        UniqueConstraint('description', name='description'),
        ForeignKeyConstraint(['group_id'], ['VLANDomain.id'], name='VLANDomain-FK-group_id', onupdate='RESTRICT',
                             ondelete='SET NULL'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    group_id: Mapped[int | None] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=True)
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)


class VLANIPv4(Base):
    __tablename__ = 'VLANIPv4'
    __table_args__ = (
        Index('VLANIPv4-FK-compound', 'domain_id', 'vlan_id'),
        UniqueConstraint('ipv4net_id', 'domain_id', 'vlan_id', name='network-domain-vlan'),
        ForeignKeyConstraint(['domain_id', 'vlan_id'], ['VLANDescription.domain_id', 'VLANDescription.vlan_id'],
                             name='VLANIPv4-FK-compound', onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['ipv4net_id'], ['IPv4Network.id'], name='VLANIPv4-FK-ipv4net_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    domain_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    ipv4net_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    __mapper_args__ = {"primary_key": (ipv4net_id, domain_id, vlan_id)}


class VLANIPv6(Base):
    __tablename__ = 'VLANIPv6'
    __table_args__ = (
        Index('VLANIPv6-FK-compound', 'domain_id', 'vlan_id'),
        UniqueConstraint('ipv6net_id', 'domain_id', 'vlan_id', name='network-domain-vlan'),
        ForeignKeyConstraint(['domain_id', 'vlan_id'], ['VLANDescription.domain_id', 'VLANDescription.vlan_id'],
                             name='VLANIPv6-FK-compound', onupdate='RESTRICT', ondelete='CASCADE'),
        ForeignKeyConstraint(['ipv6net_id'], ['IPv6Network.id'], name='VLANIPv6-FK-ipv6net_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    domain_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    ipv6net_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    __mapper_args__ = {"primary_key": (ipv6net_id, domain_id, vlan_id)}


class VLANSTRule(Base):
    __tablename__ = 'VLANSTRule'
    __table_args__ = (
        UniqueConstraint('vst_id', 'rule_no', name='vst-rule'),
        ForeignKeyConstraint(['vst_id'], ['VLANSwitchTemplate.id'], name='VLANSTRule-FK-vst_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    vst_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    rule_no: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    port_pcre: Mapped[str] = mapped_column(mysql.CHAR(255), nullable=False)
    port_role: Mapped[str] = mapped_column(mysql.ENUM('access', 'trunk', 'anymode', 'uplink', 'downlink', 'none'),
                                           nullable=False, server_default=text("'none'"))
    wrt_vlans: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    __mapper_args__ = {"primary_key": (vst_id, rule_no)}


class VLANSwitch(Base):
    __tablename__ = 'VLANSwitch'
    __table_args__ = (
        Index('domain_id', 'domain_id'),
        Index('last_errno', 'last_errno'),
        UniqueConstraint('object_id', name='object_id'),
        Index('out_of_sync', 'out_of_sync'),
        Index('template_id', 'template_id'),
        ForeignKeyConstraint(['domain_id'], ['VLANDomain.id'], name='VLANSwitch-FK-domain_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='VLANSwitch-FK-object_id', onupdate='RESTRICT',
                             ondelete='RESTRICT'),
        ForeignKeyConstraint(['template_id'], ['VLANSwitchTemplate.id'], name='VLANSwitch-FK-template_id',
                             onupdate='RESTRICT', ondelete='RESTRICT'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    domain_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    template_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    mutex_rev: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                           server_default=text('0'))
    out_of_sync: Mapped[str] = mapped_column(mysql.ENUM('yes', 'no'), nullable=False, server_default=text("'yes'"))
    last_errno: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                            server_default=text('0'))
    last_change: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                                  server_default=text("'0000-00-00 00:00:00'"))
    last_push_started: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                                        server_default=text("'0000-00-00 00:00:00'"))
    last_push_finished: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                                         server_default=text("'0000-00-00 00:00:00'"))
    last_error_ts: Mapped[datetime] = mapped_column(mysql.TIMESTAMP(), nullable=False,
                                                    server_default=text("'0000-00-00 00:00:00'"))
    __mapper_args__ = {"primary_key": (object_id,)}


class VLANSwitchTemplate(Base):
    __tablename__ = 'VLANSwitchTemplate'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        UniqueConstraint('description', name='description'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    mutex_rev: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10), nullable=False)
    description: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    saved_by: Mapped[str] = mapped_column(mysql.CHAR(64), nullable=False)


class VLANValidID(Base):
    __tablename__ = 'VLANValidID'
    __table_args__ = (
        PrimaryKeyConstraint('vlan_id', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    vlan_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False,
                                         server_default=text('1'))


class VS(Base):
    __tablename__ = 'VS'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='PRIMARY'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False, autoincrement=True)
    name: Mapped[str | None] = mapped_column(mysql.CHAR(255), nullable=True)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class VSEnabledIPs(Base):
    __tablename__ = 'VSEnabledIPs'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'vs_id', 'vip', 'rspool_id', name='PRIMARY'),
        Index('VSEnabledIPs-FK-rspool_id', 'rspool_id'),
        Index('VSEnabledIPs-FK-vs_id-vip', 'vs_id', 'vip'),
        Index('vip', 'vip'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='VSEnabledIPs-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['rspool_id'], ['IPv4RSPool.id'], name='VSEnabledIPs-FK-rspool_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['vs_id', 'vip'], ['VSIPs.vs_id', 'VSIPs.vip'], name='VSEnabledIPs-FK-vs_id-vip',
                             onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vs_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vip: Mapped[bytes] = mapped_column(mysql.VARBINARY(16), nullable=False)
    rspool_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    prio: Mapped[str | None] = mapped_column(mysql.VARCHAR(255), nullable=True)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class VSEnabledPorts(Base):
    __tablename__ = 'VSEnabledPorts'
    __table_args__ = (
        PrimaryKeyConstraint('object_id', 'vs_id', 'proto', 'vport', 'rspool_id', name='PRIMARY'),
        Index('VSEnabledPorts-FK-rspool_id', 'rspool_id'),
        Index('VSEnabledPorts-FK-vs_id-proto-vport', 'vs_id', 'proto', 'vport'),
        ForeignKeyConstraint(['object_id'], ['Object.id'], name='VSEnabledPorts-FK-object_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['rspool_id'], ['IPv4RSPool.id'], name='VSEnabledPorts-FK-rspool_id', onupdate='RESTRICT',
                             ondelete='CASCADE'),
        ForeignKeyConstraint(['vs_id', 'proto', 'vport'], ['VSPorts.vs_id', 'VSPorts.proto', 'VSPorts.vport'],
                             name='VSEnabledPorts-FK-vs_id-proto-vport', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    object_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vs_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    proto: Mapped[str] = mapped_column(mysql.ENUM('TCP', 'UDP', 'MARK'), nullable=False)
    vport: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    rspool_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class VSIPs(Base):
    __tablename__ = 'VSIPs'
    __table_args__ = (
        PrimaryKeyConstraint('vs_id', 'vip', name='PRIMARY'),
        Index('vip', 'vip'),
        ForeignKeyConstraint(['vs_id'], ['VS.id'], name='VSIPs-vs_id', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    vs_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vip: Mapped[bytes] = mapped_column(mysql.VARBINARY(16), nullable=False)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)


class VSPorts(Base):
    __tablename__ = 'VSPorts'
    __table_args__ = (
        PrimaryKeyConstraint('vs_id', 'proto', 'vport', name='PRIMARY'),
        Index('proto-vport', 'proto', 'vport'),
        ForeignKeyConstraint(['vs_id'], ['VS.id'], name='VS-vs_id', onupdate='RESTRICT', ondelete='CASCADE'),
        {'mysql_engine': 'InnoDB', 'mysql_collate': 'utf8mb3_unicode_ci', 'mysql_row_format': 'Dynamic'},
    )
    vs_id: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    proto: Mapped[str] = mapped_column(mysql.ENUM('TCP', 'UDP', 'MARK'), nullable=False)
    vport: Mapped[int] = mapped_column(mysql.INTEGER(display_width=10, unsigned=True), nullable=False)
    vsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
    rsconfig: Mapped[str | None] = mapped_column(mysql.TEXT(), nullable=True)
