SELECT
  `O`.`id` AS `id`,
  `O`.`name` AS `name`,
  `O`.`asset_no` AS `asset_no`,
  `O`.`has_problems` AS `has_problems`,
  `O`.`comment` AS `comment`,
  `AV_H`.`uint_value` AS `height`,
  `AV_S`.`uint_value` AS `sort_order`,
  `RT`.`thumb_data` AS `thumb_data`,
  `R`.`id` AS `row_id`,
  `R`.`name` AS `row_name`,
  `L`.`id` AS `location_id`,
  `L`.`name` AS `location_name`
FROM
  (
    (
      (
        (
          (
            (
              (
                `racktables`.`Object` `O`
                LEFT JOIN `racktables`.`AttributeValue` `AV_H` ON(
                  `O`.`id` = `AV_H`.`object_id`
                  AND `AV_H`.`attr_id` = 27
                )
              )
              LEFT JOIN `racktables`.`AttributeValue` `AV_S` ON(
                `O`.`id` = `AV_S`.`object_id`
                AND `AV_S`.`attr_id` = 29
              )
            )
            LEFT JOIN `racktables`.`RackThumbnail` `RT` ON(`O`.`id` = `RT`.`rack_id`)
          )
          LEFT JOIN `racktables`.`EntityLink` `RL` ON(
            `O`.`id` = `RL`.`child_entity_id`
            AND `RL`.`parent_entity_type` = 'row'
            AND `RL`.`child_entity_type` = 'rack'
          )
        )
        JOIN `racktables`.`Object` `R` ON(`R`.`id` = `RL`.`parent_entity_id`)
      )
      LEFT JOIN `racktables`.`EntityLink` `LL` ON(
        `R`.`id` = `LL`.`child_entity_id`
        AND `LL`.`parent_entity_type` = 'location'
        AND `LL`.`child_entity_type` = 'row'
      )
    )
    LEFT JOIN `racktables`.`Object` `L` ON(`L`.`id` = `LL`.`parent_entity_id`)
  )
WHERE
  `O`.`objtype_id` = 1560